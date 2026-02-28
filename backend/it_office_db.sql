-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 28, 2026 at 11:52 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `it_office_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `borrowed_items`
--

CREATE TABLE `borrowed_items` (
  `id` int(11) NOT NULL,
  `borrower_name` varchar(255) NOT NULL,
  `contact_number` varchar(255) DEFAULT NULL,
  `office` varchar(255) NOT NULL,
  `item_borrowed` varchar(255) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `released_by` varchar(255) NOT NULL,
  `date_borrowed` date NOT NULL,
  `returned_by` varchar(255) DEFAULT NULL,
  `received_by` varchar(255) DEFAULT NULL,
  `return_date` date DEFAULT NULL,
  `comments` text DEFAULT NULL,
  `status` enum('Pending','Returned') NOT NULL DEFAULT 'Pending',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `borrowed_items`
--

INSERT INTO `borrowed_items` (`id`, `borrower_name`, `contact_number`, `office`, `item_borrowed`, `quantity`, `released_by`, `date_borrowed`, `returned_by`, `received_by`, `return_date`, `comments`, `status`, `created_at`, `updated_at`) VALUES
(2, 'Shannel Morallo', '09123456789', 'Comelec', 'extension', 2, 'OJT: Shan', '2026-02-28', 'Shannel Morallo', 'OJT: Shan', '2026-02-28', 'asdf', 'Returned', '2026-02-28 18:07:49', '2026-02-28 18:08:07');

-- --------------------------------------------------------

--
-- Table structure for table `employees`
--

CREATE TABLE `employees` (
  `id` int(11) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `employees`
--

INSERT INTO `employees` (`id`, `full_name`, `is_active`) VALUES
(1, 'Juan dela Cruz', 1),
(2, 'Maria Santos', 1),
(3, 'Jose Reyes', 1),
(4, 'Ana Garcia', 1),
(5, 'Pedro Bautista', 1);

-- --------------------------------------------------------

--
-- Table structure for table `offices`
--

CREATE TABLE `offices` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `offices`
--

INSERT INTO `offices` (`id`, `name`) VALUES
(2, 'Administrative Division'),
(3, 'Finance Division'),
(4, 'Human Resource Division'),
(5, 'IT Division'),
(8, 'Legal Division'),
(1, 'Office of the Director'),
(6, 'Planning Division'),
(7, 'Records Division');

-- --------------------------------------------------------

--
-- Table structure for table `repairs`
--

CREATE TABLE `repairs` (
  `id` int(11) NOT NULL,
  `customer_name` varchar(255) NOT NULL,
  `contact_number` varchar(255) DEFAULT NULL,
  `office` varchar(255) NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `serial_specs` varchar(255) DEFAULT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `date_received` date NOT NULL,
  `received_by` varchar(255) NOT NULL,
  `problem_description` text NOT NULL,
  `repaired_by` varchar(255) DEFAULT NULL,
  `repair_comment` text DEFAULT NULL,
  `repair_condition` enum('Fixed','Unserviceable') DEFAULT NULL,
  `claimed_by` varchar(255) DEFAULT NULL,
  `date_claimed` date DEFAULT NULL,
  `released_by` varchar(255) DEFAULT NULL,
  `status` enum('Pending','Released') NOT NULL DEFAULT 'Pending',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `repairs`
--

INSERT INTO `repairs` (`id`, `customer_name`, `contact_number`, `office`, `item_name`, `serial_specs`, `quantity`, `date_received`, `received_by`, `problem_description`, `repaired_by`, `repair_comment`, `repair_condition`, `claimed_by`, `date_claimed`, `released_by`, `status`, `created_at`, `updated_at`) VALUES
(3, 'Maam Nutrition', '09123456789', 'RHU Nutrition', 'Printer', 'Printer Ngani', 1, '2026-02-28', 'OJT: Ariel Escobilla', 'Sira', 'OJT: Ariel Escobilla', 'Yeah', 'Fixed', 'Maam Nutrition', '2026-02-28', 'OJT: Ariel Escobilla', 'Released', '2026-02-28 18:05:55', '2026-02-28 18:06:54'),
(4, 'Shannel Morallo', '09123456789', 'Office of the Director', 'gamot', 'tuf', 1, '2026-02-28', 'Jose Reyes', 'asdf', 'Juan dela Cruz', 'asdf', 'Unserviceable', 'shan', '2026-02-28', 'Jose Reyes', 'Released', '2026-02-28 18:50:54', '2026-02-28 18:51:11');

-- --------------------------------------------------------

--
-- Table structure for table `reservations`
--

CREATE TABLE `reservations` (
  `id` int(11) NOT NULL,
  `borrower_name` varchar(255) NOT NULL,
  `contact_number` varchar(255) DEFAULT NULL,
  `office` varchar(255) NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `reservation_date` date NOT NULL,
  `expected_return_date` date NOT NULL,
  `released_by` varchar(255) NOT NULL,
  `returned_by` varchar(255) DEFAULT NULL,
  `received_by` varchar(255) DEFAULT NULL,
  `actual_return_date` date DEFAULT NULL,
  `comments` text DEFAULT NULL,
  `status` enum('Active','Overdue','Returned') NOT NULL DEFAULT 'Active',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `reservations`
--

INSERT INTO `reservations` (`id`, `borrower_name`, `contact_number`, `office`, `item_name`, `quantity`, `reservation_date`, `expected_return_date`, `released_by`, `returned_by`, `received_by`, `actual_return_date`, `comments`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Shannel Morallo', '09123456789', 'Comelec', 'Extension', 1, '2026-02-27', '2026-02-27', 'OJT: Shan', 'Shannel Morallo', 'OJT: Shan', '2026-02-28', 'asdf', 'Returned', '2026-02-28 18:09:49', '2026-02-28 18:10:40');

-- --------------------------------------------------------

--
-- Table structure for table `tech4ed`
--

CREATE TABLE `tech4ed` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `gender` enum('Male','Female','Other') NOT NULL,
  `purpose` varchar(500) NOT NULL,
  `type` enum('entry','session') NOT NULL DEFAULT 'session',
  `time_in` datetime NOT NULL,
  `time_out` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `tech4ed`
--

INSERT INTO `tech4ed` (`id`, `name`, `gender`, `purpose`, `type`, `time_in`, `time_out`, `created_at`) VALUES
(4, 'asdf', 'Female', 'asdf', 'entry', '2026-02-28 18:49:33', NULL, '2026-02-28 18:49:33'),
(5, 'asdfasd', 'Male', 'asdfsdf', 'session', '2026-02-28 18:49:48', '2026-02-28 18:50:03', '2026-02-28 18:49:48');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password`) VALUES
(1, 'admin', '$2b$10$8pNa69iSgfdL8vMU9kRc7.mOU0UQJwAeEHs.eMW8FfrAbEs0o5Js.');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `borrowed_items`
--
ALTER TABLE `borrowed_items`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `employees`
--
ALTER TABLE `employees`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `full_name` (`full_name`);

--
-- Indexes for table `offices`
--
ALTER TABLE `offices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `repairs`
--
ALTER TABLE `repairs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `reservations`
--
ALTER TABLE `reservations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tech4ed`
--
ALTER TABLE `tech4ed`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `borrowed_items`
--
ALTER TABLE `borrowed_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `employees`
--
ALTER TABLE `employees`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `offices`
--
ALTER TABLE `offices`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `repairs`
--
ALTER TABLE `repairs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `reservations`
--
ALTER TABLE `reservations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `tech4ed`
--
ALTER TABLE `tech4ed`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
